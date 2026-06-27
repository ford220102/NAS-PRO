#include <QApplication>
#include <QWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QLabel>

class Login : public QWidget {
public:
    Login() {
        setWindowTitle("NAS-PRO Login");

        QVBoxLayout *layout = new QVBoxLayout(this);

        QLabel *title = new QLabel("NAS-PRO SYSTEM LOGIN");
        QPushButton *loginBtn = new QPushButton("Login");

        layout->addWidget(title);
        layout->addWidget(loginBtn);

        connect(loginBtn, &QPushButton::clicked, this, [](){
            system("./nas-desktop");
        });
    }
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Login login;
    login.resize(300, 200);
    login.show();

    return app.exec();
}
